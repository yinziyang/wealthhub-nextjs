'use client';

import { useEffect } from 'react';
import { Modal } from 'antd-mobile';
import { Workbox } from 'workbox-window';

export default function UpdatePrompt() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const wb = new Workbox('/sw.js');

      const showSkipWaitingPrompt = () => {
        Modal.alert({
          title: '发现新版本',
          content: '为了保证应用正常运行，请更新到最新版本。',
          confirmText: '立即刷新',
          onConfirm: () => {
            wb.addEventListener('controlling', () => {
              window.location.reload();
            });
            wb.messageSkipWaiting();
          },
          // Prevent closing by clicking mask
          closeOnMaskClick: false,
        });
      };

      // Add an event listener to detect when the registered
      // service worker has installed but is waiting to activate.
      wb.addEventListener('waiting', showSkipWaitingPrompt);

      // Register the service worker
      wb.register();
    }
  }, []);

  return null;
}
