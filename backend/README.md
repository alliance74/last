# Charm Line AI - Backend

This is the backend service for Charm Line AI, built with Node.js, Express, and Firebase.

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Firebase project with Firestore and Authentication enabled

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/charm-line-ai.git
   cd charm-line-ai/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   ```

3. **Set up Firebase Service Account**
   - Place your Firebase service account JSON file at `config/service-account.json`
   - The file should be named exactly `service-account.json`
   - Make sure this file is listed in `.gitignore` to prevent committing sensitive data

4. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the following variables in `.env`:
     ```
     PORT=5000
     NODE_ENV=development
     JWT_SECRET=your-jwt-secret-key
     JWT_EXPIRES_IN=15m
     REFRESH_TOKEN_EXPIRES_IN=7d
     CORS_ORIGIN=http://localhost:3000
     ```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update current user profile
- `DELETE /api/users/me` - Delete current user account

### Subscriptions
- `GET /api/subscriptions/plans` - Get available subscription plans
- `GET /api/subscriptions/my-subscription` - Get current user's subscription
- `POST /api/subscriptions/subscribe` - Subscribe to a plan
- `POST /api/subscriptions/cancel` - Cancel subscription

## Security

- All sensitive routes are protected with JWT authentication
- Passwords are hashed using bcrypt
- CORS is configured to only allow requests from specified origins
- Rate limiting is implemented to prevent abuse

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment (development/production) | development |
| JWT_SECRET | Secret for signing JWTs | - |
| JWT_EXPIRES_IN | JWT expiration time | 15m |
| REFRESH_TOKEN_EXPIRES_IN | Refresh token expiration | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
# or
yarn dev
```

The server will start at `http://localhost:5000`

### Production
```bash
npm start
# or
yarn start
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Update password
- `DELETE /api/users` - Delete account
- `GET /api/users/referrals` - Get user's referrals

### Subscriptions

- `GET /api/subscriptions/plans` - Get available subscription plans
- `POST /api/subscriptions/subscribe` - Subscribe to a plan
- `GET /api/subscriptions/me` - Get current subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

## Environment Variables

See `.env.example` for all available environment variables.

## Deployment

### Prerequisites
- Docker (for containerization)
- Kubernetes (for orchestration, optional)
- Cloud provider account (AWS, GCP, Azure)

### Building Docker Image
```bash
docker build -t charm-line-ai-backend .
```

### Running with Docker
```bash
docker run -p 5000:5000 --env-file .env charm-line-ai-backend
```

## Testing

### Running Tests
```bash
npm test
# or
yarn test
```

### Linting
```bash
npm run lint
# or
yarn lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@charmline.ai or open an issue in the repository.
