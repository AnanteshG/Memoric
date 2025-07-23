# Memoric - AI-Powered Second Brain

Memoric is an AI-powered personal knowledge base that allows you to store, search, and interact with your digital content. Transform your documents, notes, and tweets into a queryable knowledge base with AI-powered insights.

## ✨ Features

- 🧠 **AI-Powered Chat**: Ask questions about your stored content using Google Gemini AI
- 📄 **Content Storage**: Upload documents, create notes, and save digital content
- 🔍 **Smart Search**: Intelligent search through your stored knowledge base
- 🔐 **Secure Authentication**: User authentication and management with Clerk
- 📱 **Responsive Design**: Beautiful, mobile-friendly interface with modern animations
- ⚡ **Real-time Updates**: Instant synchronization across devices
- 🎨 **Modern UI**: Clean interface with animated backgrounds and smooth interactions

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router and Turbopack
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Type safety and developer experience
- **Tailwind CSS 4** - Modern utility-first styling
- **Framer Motion** - Smooth animations and interactions
- **Lucide React** - Beautiful, customizable icons

### Backend & Services

- **Next.js API Routes** - Server-side functionality
- **Firebase Firestore** - NoSQL database for data storage
- **Firebase Storage** - File storage and management
- **Clerk** - Authentication and user management
- **Google Gemini AI** - Advanced language model for AI features

### Development Tools

- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Canvas Confetti** - Celebration animations
- **React Hot Toast** - Elegant notifications

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Firebase Account** - For database and storage
- **Google AI Studio Account** - For Gemini AI API access
- **Clerk Account** - For authentication services

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/memoric.git
cd memoric
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 🔑 Environment Setup Guide

#### Clerk Setup

1. Go to [Clerk.dev](https://clerk.dev) and create an account
2. Create a new application
3. Copy your publishable key and secret key
4. Configure sign-in/sign-up pages in your Clerk dashboard

#### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Enable Storage
5. Get your config from Project Settings

#### Google AI Studio Setup

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Create an API key for Gemini
3. Add the API key to your environment variables

4. **Run the development server:**

```bash
npm run dev
```

5. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000) to see your application.

## 🏗️ Project Structure

```
memoric/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── pages/             # Page-specific components
│   │   └── ui/                # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and configs
│   │   ├── models/            # Data models
│   │   ├── services/          # API services
│   │   └── utils/             # Helper functions
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
└── package.json               # Dependencies and scripts
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect to Vercel:**

   - Push your code to GitHub
   - Go to [Vercel Dashboard](https://vercel.com)
   - Import your repository

2. **Configure Environment Variables:**

   - Add all environment variables from your `.env.local`
   - Ensure all API keys are properly set

3. **Deploy:**
   - Vercel will automatically build and deploy your application
   - Your app will be available at `https://your-app-name.vercel.app`

### Other Platforms

You can also deploy to:

- **Netlify** - Great for static sites
- **Railway** - Full-stack deployment
- **DigitalOcean App Platform** - Container-based deployment

## 🧪 Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes and commit:**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Ensure responsive design
- Add proper error handling
- Write clear commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing React framework
- **Vercel** - For the deployment platform
- **Google** - For the Gemini AI API
- **Clerk** - For authentication services
- **Firebase** - For database and storage

## 📞 Support

If you have any questions or need help:

- 🐛 **Bug Reports**: [Open an issue](https://github.com/your-username/memoric/issues)
- 💡 **Feature Requests**: [Open an issue](https://github.com/your-username/memoric/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/memoric/discussions)

---

**Built with ❤️ using Next.js 15 and modern web technologies**
