import React from 'react';

// 響應式容器組件
const ResponsiveContainer = ({ 
  children, 
  className = '', 
  maxWidth = 'container-custom',
  padding = 'py-4 sm:py-6 lg:py-8',
  center = true 
}) => {
  return (
    <div className={`${maxWidth} ${padding} ${center ? 'mx-auto' : ''} ${className}`}>
      {children}
    </div>
  );
};

// 響應式網格組件
export const ResponsiveGrid = ({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'gap-4 sm:gap-6 lg:gap-8',
  className = ''
}) => {
  const getGridCols = () => {
    const gridCols = [];
    if (cols.default) gridCols.push(`grid-cols-${cols.default}`);
    if (cols.sm) gridCols.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) gridCols.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) gridCols.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) gridCols.push(`xl:grid-cols-${cols.xl}`);
    return gridCols.join(' ');
  };

  return (
    <div className={`grid ${getGridCols()} ${gap} ${className}`}>
      {children}
    </div>
  );
};

// 響應式卡片組件
export const ResponsiveCard = ({ 
  children, 
  className = '',
  padding = 'p-4 sm:p-6',
  hover = true 
}) => {
  return (
    <div className={`
      bg-surface rounded-xl shadow-lg border border-white/5 
      ${padding} 
      ${hover ? 'hover:shadow-xl hover:border-white/10 transition-all duration-200' : ''} 
      ${className}
    `}>
      {children}
    </div>
  );
};

// 響應式按鈕組件
export const ResponsiveButton = ({ 
  children, 
  onClick, 
  variant = 'primary', // primary, secondary, danger, ghost
  size = 'md', // sm, md, lg
  disabled = false,
  loading = false,
  className = '',
  ...props 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-white hover:bg-primary/80 disabled:bg-primary/50';
      case 'secondary':
        return 'bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5';
      case 'danger':
        return 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:bg-red-500/10';
      case 'ghost':
        return 'text-text-secondary hover:text-text-primary hover:bg-white/5 disabled:text-gray-500';
      default:
        return 'bg-primary text-white hover:bg-primary/80 disabled:bg-primary/50';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'md':
        return 'px-4 py-2';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        rounded-lg transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          載入中...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// 響應式輸入組件
export const ResponsiveInput = ({ 
  value, 
  onChange, 
  placeholder = '',
  type = 'text',
  disabled = false,
  error = false,
  className = '',
  ...props 
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full p-3 sm:p-4
        bg-white/10 border rounded-lg
        text-white placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-primary/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/20'}
        ${className}
      `}
      {...props}
    />
  );
};

// 響應式標籤組件
export const ResponsiveLabel = ({ 
  children, 
  htmlFor, 
  className = '',
  required = false 
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`
        block text-sm sm:text-base text-white mb-2
        ${required ? 'after:content-["*"] after:text-red-400 after:ml-1' : ''}
        ${className}
      `}
    >
      {children}
    </label>
  );
};

// 響應式標題組件
export const ResponsiveTitle = ({ 
  children, 
  level = 1, // 1-6
  className = '',
  gradient = false 
}) => {
  const getSizeClasses = () => {
    switch (level) {
      case 1:
        return 'text-2xl sm:text-3xl lg:text-4xl';
      case 2:
        return 'text-xl sm:text-2xl lg:text-3xl';
      case 3:
        return 'text-lg sm:text-xl lg:text-2xl';
      case 4:
        return 'text-base sm:text-lg lg:text-xl';
      case 5:
        return 'text-sm sm:text-base lg:text-lg';
      case 6:
        return 'text-xs sm:text-sm lg:text-base';
      default:
        return 'text-xl sm:text-2xl lg:text-3xl';
    }
  };

  const getGradientClasses = () => {
    return gradient ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent' : 'text-white';
  };

  const Tag = `h${level}`;

  return (
    <Tag className={`font-bold ${getSizeClasses()} ${getGradientClasses()} ${className}`}>
      {children}
    </Tag>
  );
};

// 響應式文字組件
export const ResponsiveText = ({ 
  children, 
  size = 'base', // xs, sm, base, lg, xl
  color = 'white', // white, secondary, primary, danger, success
  className = '',
  ...props 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'text-xs';
      case 'sm':
        return 'text-sm';
      case 'base':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      case 'xl':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'white':
        return 'text-white';
      case 'secondary':
        return 'text-text-secondary';
      case 'primary':
        return 'text-primary';
      case 'danger':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-white';
    }
  };

  return (
    <p className={`${getSizeClasses()} ${getColorClasses()} ${className}`} {...props}>
      {children}
    </p>
  );
};

export default ResponsiveContainer;
