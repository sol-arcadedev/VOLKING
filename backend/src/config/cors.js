export const corsOptions = {
    origin: [
        'https://volking.fun',
        'https://www.volking.fun',
        'https://volking.pages.dev',
        'http://localhost:5173',
        'http://localhost:3000',
        /\.pages\.dev$/,
        /\.volking\.fun$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};