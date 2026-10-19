/**
 * Server settings
 * Lets the desktop (Electron) client point at a remote BudgetingApp server.
 * Renders nothing in the browser, where the server is always the current origin.
 */

import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Text } = Typography;

interface ServerSettingsValues {
  url: string;
}

const ServerSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [form] = Form.useForm<ServerSettingsValues>();

  const isDesktop = Boolean(window.electronAPI?.setBackendUrl);

  useEffect(() => {
    setCurrentUrl(apiClient.getBaseUrl() || '');
  }, [open]);

  if (!isDesktop) {
    return null;
  }

  const handleSave = async (values: ServerSettingsValues): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const url = values.url.trim().replace(/\/+$/, '');
      await apiClient.setBaseUrl(url);
      await apiClient.checkHealth();
      // Reload so every cached query and the auth context re-resolve against the new server.
      window.location.reload();
    } catch (err: any) {
      setError(
        `Could not reach that server: ${err?.message || 'unknown error'}. ` +
          'Check the address and that the device is on the tailnet.'
      );
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        icon={<CloudServerOutlined />}
        style={{ marginTop: 16 }}
        onClick={() => setOpen(true)}
      >
        Server settings
      </Button>

      <Modal
        title="Server settings"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Enter the address of your BudgetingApp server, for example{' '}
          <code>http://budget-server:8000</code> or{' '}
          <code>https://budget-server.tailnet.ts.net</code>.
        </Text>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form<ServerSettingsValues>
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{ url: currentUrl }}
          requiredMark={false}
        >
          <Form.Item
            name="url"
            label="Server URL"
            rules={[
              { required: true, message: 'Please enter the server URL' },
              {
                pattern: /^https?:\/\/.+/i,
                message: 'The URL must start with http:// or https://',
              },
            ]}
          >
            <Input placeholder="http://budget-server:8000" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={saving}>
              Save and reconnect
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ServerSettings;
