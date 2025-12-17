import React, { useState } from 'react';
import { Layout, Menu, theme, Modal, Row, Col, Typography } from 'antd';
import {
  DashboardOutlined,
  WalletOutlined,
  TransactionOutlined,
  PieChartOutlined,
  TagsOutlined,
  TrophyOutlined,
  CalendarOutlined,
  BarChartOutlined,
  DollarCircleOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, THEME_OPTIONS } from '../../App';

const { Content, Sider } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { currentTheme, setTheme } = useTheme();
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/accounts', icon: <WalletOutlined />, label: 'Accounts' },
    { key: '/transactions', icon: <TransactionOutlined />, label: 'Transactions' },
    { key: '/budgets', icon: <PieChartOutlined />, label: 'Budgets' },
    { key: '/categories', icon: <TagsOutlined />, label: 'Categories' },
    { key: '/goals', icon: <TrophyOutlined />, label: 'Goals' },
    { key: '/income', icon: <CalendarOutlined />, label: 'Income' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  ];

  return (
    <Layout className={`theme-${currentTheme}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider 
        width={220} 
        style={{ 
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'hidden',
        }}
      >
        {/* Logo/Brand */}
        <div style={{ 
          padding: '20px 20px', 
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <DollarCircleOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
          <span style={{ 
            fontSize: '17px', 
            fontWeight: 600,
            color: token.colorTextHeading,
            letterSpacing: '-0.3px',
          }}>
            BudgetingApp
          </span>
        </div>
        
        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ 
            height: 'calc(100% - 130px)', 
            borderRight: 0,
            background: 'transparent',
            padding: '12px 8px',
          }}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
        
        {/* Theme Picker Button */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <button 
            className="theme-picker-btn"
            onClick={() => setThemeModalOpen(true)}
          >
            <BgColorsOutlined style={{ fontSize: 16 }} />
            <span style={{ fontSize: 13 }}>Theme</span>
          </button>
        </div>
      </Sider>
      
      {/* Theme Selection Modal */}
      <Modal
        title="Choose Theme"
        open={themeModalOpen}
        onCancel={() => setThemeModalOpen(false)}
        footer={null}
        width={480}
      >
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {THEME_OPTIONS.map((themeOption) => (
            <Col span={8} key={themeOption.id}>
              <div
                className={`theme-swatch theme-swatch-${themeOption.id} ${currentTheme === themeOption.id ? 'active' : ''}`}
                onClick={() => {
                  setTheme(themeOption.id);
                  setThemeModalOpen(false);
                }}
              >
                <span className="theme-swatch-label">{themeOption.name}</span>
              </div>
            </Col>
          ))}
        </Row>
        <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
          Theme preference is saved automatically.
        </Text>
      </Modal>
      <Layout style={{ background: token.colorBgLayout, overflow: 'hidden' }}>
        <Content
          style={{
            padding: 24,
            margin: 0,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
