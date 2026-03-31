# Etapa 1: Compilar la aplicación React/Vite
FROM node:18-alpine AS build

WORKDIR /app

# Copiar el package.json y package-lock.json primero
# (esto aprovecha el caché de Docker para acelerar instalaciones futuras)
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
