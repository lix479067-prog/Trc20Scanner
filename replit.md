# TRC20 Private Key Importer

## Overview

This is a full-stack React application for importing TRON wallets using private keys and checking their balances. The application provides a secure, user-friendly interface for users to input their TRC20 private keys and retrieve comprehensive wallet information including TRX balance, tokens, transaction history, and resource usage (energy and bandwidth).

The application is built with a modern tech stack featuring a React frontend with TypeScript, Express.js backend, and integrates with the TRON blockchain network through TronWeb. It emphasizes security by processing private keys locally and never storing sensitive information on servers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI design
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form validation
- **Internationalization**: Custom language context supporting English and Chinese translations

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API endpoints for wallet operations
- **Validation**: Zod schemas for request/response validation and type safety
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

### Database and Storage
- **Database**: PostgreSQL configured with Drizzle ORM
- **Migration**: Drizzle Kit for database schema management
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **Storage Strategy**: Currently using external TRON APIs with minimal local storage needs

### Authentication and Security
- **Private Key Handling**: Client-side processing only - private keys are never stored or transmitted to servers
- **API Security**: Input validation on all endpoints with proper error handling
- **Session Management**: Basic session configuration with connect-pg-simple for potential future authentication

### External Service Integrations
- **TRON Network**: TronWeb library for blockchain interactions and address generation
- **API Provider**: TronGrid API for fetching wallet balances, transactions, and network data
- **Rate Limiting**: Configured with TRON-PRO-API-KEY for enhanced API limits

### Development and Build Process
- **Build Tool**: Vite for fast development and optimized production builds
- **Development**: Hot module replacement with Vite dev server
- **Production**: esbuild for server bundling and Vite for client bundling
- **Code Quality**: TypeScript strict mode with comprehensive type checking

### Key Design Decisions
- **Monorepo Structure**: Shared schemas between client and server in `/shared` directory
- **Type Safety**: End-to-end TypeScript with shared types and Zod validation
- **Component Architecture**: Modular UI components with consistent design system
- **API Integration**: Mutation-based data fetching for wallet operations with proper loading states
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages

## External Dependencies

### Core Blockchain Integration
- **TronWeb**: Official TRON JavaScript library for blockchain interactions
- **@neondatabase/serverless**: Serverless PostgreSQL driver for database connections
- **TronGrid API**: TRON network API service for real-time blockchain data

### UI and Styling
- **@radix-ui**: Complete set of accessible UI primitives for React
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Modern icon library with consistent design
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind

### State Management and Data Fetching
- **@tanstack/react-query**: Powerful data synchronization for React applications
- **React Hook Form**: Performant forms with easy validation
- **@hookform/resolvers**: Validation resolvers for React Hook Form

### Development and Build Tools
- **Vite**: Next generation frontend tooling for development and building
- **Drizzle ORM**: TypeScript ORM for PostgreSQL with excellent developer experience
- **esbuild**: Fast JavaScript bundler for server-side code
- **PostCSS**: CSS processing tool with Tailwind CSS integration

### Validation and Type Safety
- **Zod**: TypeScript-first schema validation library
- **drizzle-zod**: Integration between Drizzle ORM and Zod for schema validation