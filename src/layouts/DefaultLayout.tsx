/**
 * 默认布局组件
 * 提供统一的页面结构（顶栏 + 内容区）
 */

import type { ReactNode } from 'react';
import { Layout, Typography } from 'antd';
import { APP_TITLE } from '@/constants';
import styles from './index.module.css';

const { Header, Content } = Layout;
const { Text } = Typography;

interface DefaultLayoutProps {
  children: ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Text className={styles.title}>{APP_TITLE}</Text>
      </Header>
      <Content className={styles.content}>{children}</Content>
    </Layout>
  );
}
