-- =============================================
-- MIGRACION: Agregar tabla de servicios y jerarquia
-- Ejecutar en la base de datos de produccion
-- =============================================

-- Tabla de servicios (categorias de negocio)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'folder',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices para servicios
CREATE INDEX IF NOT EXISTS idx_services_created_by ON services(created_by);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_order ON services(order_index);

-- Trigger para updated_at en services
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Modificar tabla projects: agregar service_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Indice para consultas por servicio
CREATE INDEX IF NOT EXISTS idx_projects_service_id ON projects(service_id);

-- =============================================
-- VISTA: Proyectos con informacion de servicio
-- =============================================
CREATE OR REPLACE VIEW projects_with_service AS
SELECT
  p.id,
  p.name,
  p.description,
  p.color,
  p.status,
  p.start_date,
  p.due_date,
  p.department_id,
  p.owner_id,
  p.service_id,
  p.created_at,
  p.updated_at,
  s.name AS service_name,
  s.color AS service_color,
  s.icon AS service_icon,
  d.name AS department_name,
  u.username AS owner_name
FROM projects p
LEFT JOIN services s ON s.id = p.service_id
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN users u ON u.id = p.owner_id;

-- =============================================
-- VISTA: Servicios con conteo de proyectos
-- =============================================
CREATE OR REPLACE VIEW services_with_counts AS
SELECT
  s.id,
  s.name,
  s.description,
  s.color,
  s.icon,
  s.created_by,
  s.is_active,
  s.order_index,
  s.created_at,
  s.updated_at,
  u.username AS creator_name,
  COALESCE(COUNT(p.id), 0)::integer AS project_count,
  COALESCE(SUM(
    CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END
  ), 0)::integer AS completed_projects
FROM services s
LEFT JOIN users u ON u.id = s.created_by
LEFT JOIN projects p ON p.service_id = s.id
GROUP BY s.id, u.username;

-- =============================================
-- INICIALIZACION: Crear servicio General
-- =============================================
DO $$
DECLARE
  admin_id UUID;
  service_id UUID;
BEGIN
  -- Verificar si ya existe el servicio General
  SELECT id INTO service_id FROM services WHERE name = 'General';

  IF service_id IS NULL THEN
    -- Obtener el primer admin activo
    SELECT id INTO admin_id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1;

    IF admin_id IS NOT NULL THEN
      -- Crear servicio General
      INSERT INTO services (name, description, color, icon, created_by, order_index)
      VALUES ('General', 'Proyectos generales sin categoria especifica', '#6366f1', 'folder', admin_id, 0)
      RETURNING id INTO service_id;

      RAISE NOTICE 'Servicio General creado con ID: %', service_id;
    ELSE
      RAISE NOTICE 'No se encontro un admin activo para crear el servicio General';
    END IF;
  ELSE
    RAISE NOTICE 'El servicio General ya existe con ID: %', service_id;
  END IF;
END $$;

-- Verificar que todo se creo correctamente
SELECT 'Migracion de servicios completada correctamente' AS status;
