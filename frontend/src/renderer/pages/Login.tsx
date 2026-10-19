/**
 * Login page
 * Shown whenever there is no valid session.
 */

import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, theme } from 'antd';
import { DollarCircleOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import ServerSettings from '../components/ServerSettings';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const { token } = theme.useToken();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values.username.trim(), values.password);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 24,
        background: token.colorBgLayout,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <DollarCircleOutlined style={{ fontSize: 40, color: token.colorPrimary }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
            BudgetingApp
          </Title>
          <Text type="secondary">Sign in to continue</Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="username"
              autoComplete="username"
              autoFocus
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="password"
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <ServerSettings />
    </div>
  );
};

export default Login;
