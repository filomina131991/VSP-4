import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // Used to override default overlay layout classes (e.g., items-start)
  disableOutsideClick?: boolean;
}

export default function Modal({ isOpen = true, onClose, children, className = "flex items-center justify-center p-4", disableOutsideClick = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Update ref to latest onClose handler to avoid stale closures
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Save original overflow and prevent body scrolling
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus Trap setup
    const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
    
    // Automatically focus the first focusable element on open
    if (modalRef.current) {
      const focusableElements = Array.from(modalRef.current.querySelectorAll(focusableElementsString)) as HTMLElement[];
      if (focusableElements.length > 0) {
        // Use a short timeout to ensure modal is rendered
        setTimeout(() => {
          // Only focus if current focus is outside the modal (i.e. when it first opens)
          if (!modalRef.current?.contains(document.activeElement)) {
            focusableElements[0].focus();
          }
        }, 10);
      }
    }

    // Tab key trapping
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const elements = Array.from(modalRef.current.querySelectorAll(focusableElementsString)) as HTMLElement[];
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }
        
        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement || document.activeElement === document.body) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleTabKey);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if the click is exactly on the overlay background and outside click is not disabled
    if (!disableOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Render modal at the root level using React Portal
  return createPortal(
    <div 
      ref={overlayRef}
      className={`fixed inset-0 flex items-center justify-center z-[99999] w-[100vw] h-[100vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4 ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div ref={modalRef} className="contents">
        {children}
      </div>
    </div>,
    document.body
  );
}
