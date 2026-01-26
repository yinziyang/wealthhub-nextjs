'use client';

import { ConfigProvider } from 'antd-mobile';

const AntdMobileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConfigProvider>
      <style jsx global>{`
        :root {
          --adm-color-background: #1a1c1f;
          --adm-color-text: #ededed;
          --adm-color-weak: #9ca3af;
          --adm-color-border: rgba(255, 255, 255, 0.1);
          --adm-color-primary: #a77d2f;
          --adm-color-danger: #ef4444;
          --adm-color-background-light: #fbfaf9;
          --adm-color-text-light: #0e1012;
        }
      `}</style>
      {children}
    </ConfigProvider>
  );
};

export default AntdMobileProvider;
