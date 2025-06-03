# Secure Voting Portal

A modern, dark-themed, responsive voting portal that integrates with WebAssembly encryption modules to enable secure blockchain-based voting.

## 🚀 Features

### Core Functionality
- **User Authentication**: JWT-based authentication with refresh tokens
- **Secure Voting**: WebAssembly-powered encryption for vote privacy
- **Blockchain Integration**: Immutable vote storage with transaction receipts
- **Responsive Design**: Mobile-first design with glass-morphism effects
- **Real-time Updates**: Live voting status and candidate information

### Security Features
- **End-to-end Encryption**: Votes are encrypted on the client before transmission
- **Zero-knowledge Proofs**: Vote verification without revealing vote content
- **Session Management**: Automatic timeout with extension warnings
- **Input Validation**: Comprehensive form validation and sanitization
- **Audit Trail**: Complete logging of all voting activities

### User Experience
- **Dark Theme**: Modern dark UI with accessibility considerations
- **Animations**: Smooth Framer Motion animations and transitions
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Multi-step Process**: Guided voting workflow with confirmation

## 📁 Project Structure

```
portal/src/
├── components/
│   ├── auth/                 # Authentication components
│   │   ├── LoginForm.tsx    # Login form with validation
│   │   └── SessionTimeoutWarning.tsx # Session management
│   ├── layout/              # Layout components
│   │   ├── Header.tsx       # Navigation header
│   │   └── Layout.tsx       # Main layout wrapper
│   ├── ui/                  # Reusable UI components
│   │   ├── Button.tsx       # Styled button component
│   │   ├── Input.tsx        # Form input component
│   │   ├── Modal.tsx        # Modal dialog component
│   │   └── Skeleton.tsx     # Loading skeleton components
│   ├── voting/              # Voting-specific components
│   │   ├── CandidateCard.tsx # Candidate selection card
│   │   └── VoteConfirmation.tsx # Vote confirmation modal
│   └── ErrorBoundary.tsx    # Error boundary component
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── useVoting.ts        # Voting logic hook
│   └── useWasm.ts          # WebAssembly integration hook
├── pages/                   # Page components
│   ├── Dashboard.tsx       # User dashboard
│   ├── Help.tsx           # Help and FAQ page
│   ├── Login.tsx          # Login page
│   ├── Logout.tsx         # Logout page
│   ├── Register.tsx       # Registration page
│   └── Voting.tsx         # Main voting interface
├── store/                  # State management (Zustand)
│   ├── authStore.ts       # Authentication state
│   └── votingStore.ts     # Voting state
├── types/                  # TypeScript type definitions
│   ├── auth.ts            # Authentication types
│   ├── voting.ts          # Voting types
│   └── wasm.ts            # WebAssembly types
├── utils/                  # Utility functions
│   ├── constants.ts       # Application constants
│   ├── crypto.ts          # Cryptographic utilities
│   ├── receipt.ts         # Vote receipt generation
│   └── validation.ts      # Form validation functions
└── App.tsx                # Main application component
```

## 🛠️ Technologies Used

- **Frontend Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **Animations**: Framer Motion for smooth transitions
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **Forms**: Custom validation with error handling
- **Notifications**: React Hot Toast
- **Build Tool**: Vite
- **WebAssembly**: Custom encryption module integration

## 🔐 Security Implementation

### Encryption Flow
1. User selects candidate
2. Vote data is encrypted using WebAssembly module
3. Encrypted vote is signed with user's private key
4. Transaction is submitted to blockchain
5. Receipt is generated with verification code

### Authentication Flow
1. User login with voter ID and password
2. JWT tokens are issued (access + refresh)
3. Tokens are stored securely with auto-refresh
4. Session timeout warnings before expiration
5. Secure logout clears all client-side data

### Privacy Guarantees
- Votes are encrypted before leaving the client
- No correlation between voter identity and vote choice
- Zero-knowledge proofs verify vote validity
- Blockchain provides immutable audit trail

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Professional dark theme with blue accents
- **Typography**: Inter font family for readability
- **Layout**: Responsive grid system with mobile-first design
- **Components**: Reusable components with consistent styling

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG 2.1 compliant contrast ratios

### User Flow
1. **Registration**: Secure account creation with validation
2. **Login**: Authenticated access with remember me option
3. **Dashboard**: Overview of voting status and election info
4. **Voting**: Guided candidate selection and confirmation
5. **Receipt**: Downloadable proof of vote submission

## 📱 Responsive Design

- **Mobile**: Optimized for phones (320px+)
- **Tablet**: Enhanced layout for tablets (768px+)
- **Desktop**: Full-featured experience (1024px+)
- **Large Screens**: Optimized for high-resolution displays

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 📊 Performance Optimizations

- **Code Splitting**: Lazy loading of routes
- **Image Optimization**: Responsive images with fallbacks
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Efficient state persistence and API caching

## 🔧 Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Backend API endpoint
- `VITE_WASM_MODULE_URL`: WebAssembly module URL
- `VITE_BLOCKCHAIN_RPC`: Blockchain RPC endpoint

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
