FROM node:lts-trixie AS build
WORKDIR /app

COPY app-source/package*.json ./
RUN npm install

COPY app-source/ ./
ENV DATABASE_URL="mysql://user:pass@localhost:3306/dummy"
RUN npx prisma generate
RUN npm run build

FROM node:lts-trixie
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next-env.d.ts ./next-env.d.ts
COPY --from=build /app/eslint.config.mjs ./eslint.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
