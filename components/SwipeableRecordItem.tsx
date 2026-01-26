'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SwipeAction, SwipeActionRef } from 'antd-mobile';

interface SwipeableRecordItemProps {
  recordId: string;
  children: React.ReactNode;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  activeSwipeId?: string | null;
  onSwipeOpen?: (id: string) => void;
  onSwipeClose?: () => void;
  editButtonText?: string;
  deleteButtonText?: string;
}

const SwipeableRecordItem: React.FC<SwipeableRecordItemProps> = ({
  recordId,
  children,
  onEdit,
  onDelete,
  activeSwipeId,
  onSwipeOpen,
  onSwipeClose,
  editButtonText = '编辑',
  deleteButtonText = '删除',
}) => {
  const ref = useRef<SwipeActionRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const isSwiped = activeSwipeId === recordId;

  useEffect(() => {
    if (isSwiped || isSwiping) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isSwiped, isSwiping]);

  useEffect(() => {
    if (activeSwipeId && activeSwipeId !== recordId && ref.current) {
      ref.current.close();
    }
  }, [activeSwipeId, recordId]);

  const handleTouchStart = () => {
    setIsSwiping(true);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
  };

  const handleEdit = () => {
    if (ref.current) {
      ref.current.close();
    }
    onEdit(recordId);
  };

  const handleDelete = () => {
    if (ref.current) {
      ref.current.close();
    }
    onDelete(recordId);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isSwiped ? 'none' : 'pan-y' }}
      className="rounded-xl overflow-hidden"
    >
      <SwipeAction
        ref={ref}
        rightActions={[
          {
            key: 'edit',
            text: editButtonText,
            color: '#a77d2f',
            onClick: handleEdit,
          },
          {
            key: 'delete',
            text: deleteButtonText,
            color: '#ef4444',
            onClick: handleDelete,
          },
        ]}
        onClose={() => {
          onSwipeClose?.();
        }}
      >
        {children}
      </SwipeAction>
    </div>
  );
};

export default SwipeableRecordItem;
