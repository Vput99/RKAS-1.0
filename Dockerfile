# Stage 1: Build the application
# Menggunakan Node.js versi 20 sebagai base image untuk tahap build
FROM node:20-alpine AS build-stage

# Menentukan direktori kerja di dalam container
WORKDIR /app

# Menambahkan argument untuk environment variables Supabase & API Key
# Vite akan mendeteksi variabel dengan prefix VITE_ saat proses build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_KEY

# Menjadikan argument tersebut sebagai Environment Variable di dalam container build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_KEY=$VITE_API_KEY

# Menyalin file package.json dan package-lock.json terlebih dahulu
# Ini dilakukan agar layer cache Docker bisa digunakan jika tidak ada perubahan dependency
COPY package*.json ./

# Menginstall semua dependencies project
RUN npm install

# Menyalin seluruh source code ke dalam container
COPY . .

# Menjalankan proses build Vite (hasilnya akan masuk ke folder /app/dist)
RUN npm run build

# Stage 2: Serve the application with Nginx
# Menggunakan Nginx versi stable-alpine yang sangat ringan untuk melayani file static
FROM nginx:stable-alpine AS production-stage

# Menyalin hasil build dari stage pertama ke folder default Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Menyalin konfigurasi nginx kustom jika diperlukan (opsional, tapi disarankan untuk SPA)
# Kita akan membuat file konfigurasi sederhana untuk menangani routing React/Vite
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Memberitahu Docker bahwa container akan berjalan di port 80
EXPOSE 80

# Menjalankan Nginx di foreground agar container tetap hidup
CMD ["nginx", "-g", "daemon off;"]
