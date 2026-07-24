import { useState } from 'react';
import { Input } from 'antd';
import styles from './ChatInput.module.css';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({ onSend, placeholder = '输入消息...', disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div className={styles.container}>
      <TextArea
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={placeholder}
        autoSize={{ minRows: 3, maxRows: 6 }}
        disabled={disabled}
      />
    </div>
  );
}
