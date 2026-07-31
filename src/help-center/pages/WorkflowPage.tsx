import React from 'react';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { WorkflowDiagram } from '../components/WorkflowDiagram';

export const WorkflowPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Interactive Workflow Diagram' }]} />
      <WorkflowDiagram />
    </div>
  );
};
