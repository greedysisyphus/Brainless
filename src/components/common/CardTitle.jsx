export function CardTitle({ children }) {
  return (
    <div className="relative mb-6 group">
      <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary 
                     bg-clip-text text-transparent relative z-10">
        {children}
      </h2>
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-secondary/10 
                      rounded-lg blur-lg group-hover:blur-xl transition-all duration-300 
                      opacity-0 group-hover:opacity-100" />
    </div>
  )
} 