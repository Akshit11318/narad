import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showUserInfo?: boolean;
  onHelpClick?: () => void;
}

export function Layout({ 
  children, 
  showHeader = true, 
  showUserInfo = true, 
  onHelpClick 
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {showHeader && (
          <Header 
            showUserInfo={showUserInfo} 
            onHelpClick={onHelpClick}
          />
        )}
        
        <main className="relative">
          {children}
        </main>
      </div>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-24 left-1/3 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}
