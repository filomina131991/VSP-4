import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => (
  <div className={cn('page-enter', className)}>
    {children}
  </div>
);

export default PageTransition;
