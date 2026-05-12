-- Habilitar la extensión HTTP si no existe (necesaria para peticiones a la API de WhatsApp)
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- ==============================================================================
-- RPC 1: Envío de mensajes de texto libres (send_whatsapp_sql)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.send_whatsapp_sql(phone text, message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ejecutar con permisos de administrador omitiendo RLS
AS $$
DECLARE
    url text;
    payload jsonb;
    headers http_header[];
    response http_response;
    
    -- Credenciales (Extraídas de tus variables de entorno)
    wa_token text := 'EAASiM1cWnToBRfGIZBboDvf6ZB4uy86vd0p1Id9hfM6cNxkp4F2VCWwsW89vnUe3RBq3U4qAaUHeNacTxKmFB7Lu2yBZB6ZBWseWmsM0mkWfmLKeh4QuyMR8XWgXobosnOokfZBcpplXocJZCJaaYtwZBQhN1mZBjNvDJvRs9GNJM6cuEA39qq7sgqYOIlOtTKoZBeAZDZD';
    wa_number_id text := '1118982104627843';
BEGIN
    -- Construir URL de Meta
    url := 'https://graph.facebook.com/v17.0/' || wa_number_id || '/messages';
    
    -- Construir payload JSON
    payload := jsonb_build_object(
        'messaging_product', 'whatsapp',
        'recipient_type', 'individual',
        'to', phone,
        'type', 'text',
        'text', jsonb_build_object(
            'preview_url', false,
            'body', message
        )
    );

    -- Configurar Headers (Bearer Token)
    headers := ARRAY[
        http_header('Authorization', 'Bearer ' || wa_token),
        http_header('Content-Type', 'application/json')
    ];

    -- Ejecutar petición POST
    response := http((
        'POST',
        url,
        headers,
        'application/json',
        payload::text
    )::http_request);

    -- Devolver la respuesta de Meta
    RETURN response.content::jsonb;
END;
$$;

-- ==============================================================================
-- RPC 2: Envío de mensajes por plantilla con componentes (send_whatsapp_components_sql)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.send_whatsapp_components_sql(
    phone text, 
    template_name text, 
    components jsonb, 
    lang text DEFAULT 'es_CO'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    url text;
    payload jsonb;
    headers http_header[];
    response http_response;
    
    -- Credenciales (Extraídas de tus variables de entorno)
    wa_token text := 'EAASiM1cWnToBRfGIZBboDvf6ZB4uy86vd0p1Id9hfM6cNxkp4F2VCWwsW89vnUe3RBq3U4qAaUHeNacTxKmFB7Lu2yBZB6ZBWseWmsM0mkWfmLKeh4QuyMR8XWgXobosnOokfZBcpplXocJZCJaaYtwZBQhN1mZBjNvDJvRs9GNJM6cuEA39qq7sgqYOIlOtTKoZBeAZDZD';
    wa_number_id text := '1118982104627843';
BEGIN
    -- Construir URL de Meta
    url := 'https://graph.facebook.com/v17.0/' || wa_number_id || '/messages';
    
    -- Construir payload JSON con la plantilla y los componentes recibidos
    payload := jsonb_build_object(
        'messaging_product', 'whatsapp',
        'to', phone,
        'type', 'template',
        'template', jsonb_build_object(
            'name', template_name,
            'language', jsonb_build_object('code', lang),
            'components', components
        )
    );

    -- Configurar Headers
    headers := ARRAY[
        http_header('Authorization', 'Bearer ' || wa_token),
        http_header('Content-Type', 'application/json')
    ];

    -- Ejecutar petición POST
    response := http((
        'POST',
        url,
        headers,
        'application/json',
        payload::text
    )::http_request);

    -- Devolver la respuesta de Meta
    RETURN response.content::jsonb;
END;
$$;

-- Forzar la recarga del esquema en PostgREST para exponer las nuevas funciones a la API REST (vital para evitar el error 404)
NOTIFY pgrst, 'reload schema';
