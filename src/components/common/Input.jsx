export function Input({ label, icon: Icon, ...props }) {
  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none
                          text-text-secondary group-focus-within:text-primary transition-colors">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          className="input-field w-full pl-10 
                     focus:ring-2 focus:ring-primary/50 
                     group-hover:border-primary/30
                     transition-all duration-300"
          {...props}
        />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 
                        opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 
                        transition-opacity duration-300 -z-10" />
      </div>
    </div>
  )
} 