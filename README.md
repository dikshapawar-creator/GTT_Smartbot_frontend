<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# GTT_Smartbot
AI-powered chatbot for import-export businesses that automates customer interaction, captures and qualifies leads, and enables seamless demo booking. It helps companies improve response time, streamline sales, and increase conversions through intelligent, real-time conversations and automated lead management.
A scalable, full-stack AI chatbot application built with modern web technologies.
This project demonstrates secure API integration, modular backend architecture, and a responsive frontend interface designed for real-world deployment.

🔎 Overview

The Hybrid AI Chatbot is a production-ready conversational platform that enables real-time interaction between users and an AI model through a secure backend API layer.

The system is designed with:

🔐 Secure environment-based credential management

🧩 Modular backend structure

⚡ Real-time API communication

🎯 Clean and responsive user interface

📦 Scalable architecture for future expansion

This project follows industry best practices for full-stack AI application development.

🏗️ System Architecture
User Interface (Frontend)
        ↓
REST API (Backend Server)
        ↓
AI Service Integration
Frontend

Handles user interaction

Sends requests to backend API

Renders AI-generated responses dynamically

Backend

Processes client requests

Reads credentials securely from .env

Connects to AI provider

Returns structured responses

✨ Core Features

💬 Real-time conversational interface

🔐 No hardcoded credentials (secure .env usage)

🧠 AI-powered response generation

📡 RESTful API architecture

📱 Responsive design

⚙️ Clean project structure

🔐 Environment Configuration

Sensitive credentials are managed securely using environment variables.

Create a .env file inside the backend directory:

PORT=5000
OPENAI_API_KEY=your_api_key_here

Important:

.env is excluded via .gitignore

No sensitive data is stored in source code

Designed for secure deployment

📁 Project Structure
root/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── server.js
│
├── frontend/
│   ├── components/
│   ├── pages/
│   └── App.js
│
└── README.md
⚙️ Installation
Clone Repository
git clone https://github.com/your-username/your-repository.git
cd your-repository
Backend Setup
cd backend
npm install
npm start
Frontend Setup
cd frontend
npm install
npm start
🛠️ Technology Stack

Frontend

React.js

HTML5 / CSS3

JavaScript (ES6+)

Backend

Node.js

Express.js

dotenv

AI Integration

OpenAI API

🎯 Design Principles

Separation of concerns

Secure configuration management

Clean code architecture

Scalable backend design

Production-ready structure

🚀 Future Enhancements

User authentication system

Chat history persistence

Database integration

Role-based access control

Deployment automation (CI/CD)

Cloud deployment support

📌 Use Case

This project serves as:

A foundation for enterprise AI chatbot systems

A scalable base for SaaS conversational platforms

A demonstration of full-stack AI integration

A portfolio-ready production architecture

👩‍💻 Author

Developed as a full-stack AI integration project demonstrating secure and scalable architecture.
>>>>>>> 6679cb94bbd275fb375318fcb608565c1ade0d25
