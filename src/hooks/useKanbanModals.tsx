import { useState } from 'react';
import { PromptModal } from '@/components/ui/PromptModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useEvent } from './useEvent';

export function useKanbanModals() {
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    onSubmit: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    onSubmit: () => {}
  });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openPrompt = useEvent((title: string, placeholder: string, onSubmit: (val: string) => void) => {
    setPromptConfig({ isOpen: true, title, placeholder, onSubmit });
  });

  const closePrompt = useEvent(() => {
    setPromptConfig(prev => ({ ...prev, isOpen: false }));
  });

  const openConfirm = useEvent((title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  });

  const closeConfirm = useEvent(() => {
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  });

  const handlePromptSubmit = useEvent((val: string) => {
    promptConfig.onSubmit(val);
    closePrompt();
  });

  const handleConfirmSubmit = useEvent(() => {
    confirmConfig.onConfirm();
    closeConfirm();
  });

  const KanbanModals = (
    <>
      <PromptModal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        placeholder={promptConfig.placeholder}
        onClose={closePrompt}
        onSubmit={handlePromptSubmit}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={handleConfirmSubmit}
        onCancel={closeConfirm}
      />
    </>
  );

  return {
    openPrompt,
    closePrompt,
    openConfirm,
    closeConfirm,
    KanbanModals
  };
}
