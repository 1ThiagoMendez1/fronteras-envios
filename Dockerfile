# Etapa 1: Compilar la aplicación React/Vite
FROM node:20-alpine AS build

WORKDIR /app

# Copiar el package.json y package-lock.json primero
# (esto aprovecha el caché de Docker para acelerar instalaciones futuras)
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Inyectar las variables de entorno para que Vite pueda incrustarlas en el build
ENV VITE_SUPABASE_URL="http://fronterasexpress-supabase-575038-85-239-249-209.traefik.me"
ENV VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ5MDEzNDYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.0a6TORlXRmZfkD90SENJtdGOETbk2YtiTwleyYJgEf8"
# Compilar el proyecto para producción
RUN npm run build

# Etapa 2: Servir la aplicación con NGINX
FROM nginx:alpine

# Limpiar las configuraciones por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar la configuración personalizada de NGINX preparada para SPA
COPY nginx.conf /etc/nginx/conf.d

# Copiar los archivos compilados de React de la etapa anterior hacia la carpeta de NGINX
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
