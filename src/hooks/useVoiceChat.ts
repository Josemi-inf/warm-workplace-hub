import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useVoiceChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Voice socket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Voice socket connection error:', err);
      setError('Error de conexión al servidor de voz');
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('Voice socket disconnected');
      setIsConnected(false);
    });

    // Handle new user joining
    socket.on('voice:user-joined', async (participant: VoiceParticipant) => {
      console.log('User joined voice:', participant.username);
      setParticipants((prev) => [...prev, participant]);

      // Create offer for new participant
      if (localStreamRef.current) {
        await createPeerConnection(participant.socketId, true);
      }
    });

    // Handle user leaving
    socket.on('voice:user-left', (participant: VoiceParticipant) => {
      console.log('User left voice:', participant.username);
      setParticipants((prev) => prev.filter((p) => p.socketId !== participant.socketId));
      closePeerConnection(participant.socketId);
    });

    // Handle existing participants list
    socket.on('voice:participants', async (existingParticipants: VoiceParticipant[]) => {
      console.log('Received participants:', existingParticipants);
      setParticipants(existingParticipants);

      // Create peer connections with existing participants
      for (const participant of existingParticipants) {
        if (localStreamRef.current) {
          await createPeerConnection(participant.socketId, true);
        }
      }
    });

    // WebRTC signaling handlers
    socket.on('webrtc:offer', async ({ socketId, offer }) => {
      console.log('Received offer from:', socketId);
      await handleOffer(socketId, offer);
    });

    socket.on('webrtc:answer', async ({ socketId, answer }) => {
      console.log('Received answer from:', socketId);
      const peerData = peerConnectionsRef.current.get(socketId);
      if (peerData) {
        await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('webrtc:ice-candidate', async ({ socketId, candidate }) => {
      const peerData = peerConnectionsRef.current.get(socketId);
      if (peerData && candidate) {
        await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      cleanupConnections();
    };
  }, []);

  const createPeerConnection = async (targetSocketId: string, createOffer: boolean) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', targetSocketId);
      const remoteStream = event.streams[0];

      // Create audio element for this peer
      let audioElement = audioElementsRef.current.get(targetSocketId);
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElementsRef.current.set(targetSocketId, audioElement);
      }
      audioElement.srcObject = remoteStream;
      audioElement.muted = isDeafened;

      const peerData = peerConnectionsRef.current.get(targetSocketId);
      if (peerData) {
        peerData.stream = remoteStream;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionsRef.current.set(targetSocketId, { connection: peerConnection });

    // Create and send offer if needed
    if (createOffer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current?.emit('webrtc:offer', {
        targetSocketId,
        offer,
      });
    }

    return peerConnection;
  };

  const handleOffer = async (socketId: string, offer: RTCSessionDescriptionInit) => {
    const peerConnection = await createPeerConnection(socketId, false);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current?.emit('webrtc:answer', {
      targetSocketId: socketId,
      answer,
    });
  };

  const closePeerConnection = (socketId: string) => {
    const peerData = peerConnectionsRef.current.get(socketId);
    if (peerData) {
      peerData.connection.close();
      peerConnectionsRef.current.delete(socketId);
    }

    const audioElement = audioElementsRef.current.get(socketId);
    if (audioElement) {
      audioElement.srcObject = null;
      audioElementsRef.current.delete(socketId);
    }
  };

  const cleanupConnections = () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((peerData) => {
      peerData.connection.close();
    });
    peerConnectionsRef.current.clear();

    // Clean up audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const joinChannel = useCallback(async (channelId: string) => {
    if (!socketRef.current?.connected) {
      setError('No hay conexión con el servidor');
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setCurrentChannel(channelId);
      socketRef.current.emit('voice:join', channelId);
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }, []);

  const leaveChannel = useCallback(() => {
    if (currentChannel && socketRef.current?.connected) {
      socketRef.current.emit('voice:leave', currentChannel);
    }

    cleanupConnections();
    setCurrentChannel(null);
    setParticipants([]);
  }, [currentChannel]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Mute/unmute all remote audio
    audioElementsRef.current.forEach((audio) => {
      audio.muted = newDeafened;
    });

    // Also mute microphone when deafened
    if (newDeafened && !isMuted) {
      toggleMute();
    }
  }, [isDeafened, isMuted, toggleMute]);

  return {
    isConnected,
    currentChannel,
    participants,
    isMuted,
    isDeafened,
    error,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
  };
}
