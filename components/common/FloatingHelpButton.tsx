import React from 'react';
import { HelpCenterProvider } from '../../help-center/context/HelpCenterContext';
import { ChatBot } from '../../help-center/components/ChatBot';

const FloatingHelpButton: React.FC = () => {
  return (
    <HelpCenterProvider>
      <ChatBot />
    </HelpCenterProvider>
  );
};

export default FloatingHelpButton;
