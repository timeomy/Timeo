import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

export function PostLoginTransition() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <img 
        src={wsfitnessLogo} 
        alt="WS Fitness" 
        className="h-20 w-20 rounded-2xl shadow-lg"
      />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-xl font-display font-bold text-foreground tracking-wide">
          WS FITNESS
        </h1>
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
