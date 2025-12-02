import React, { useState } from 'react';
import { Steps, Button, Form, Input, Select, InputNumber, Card, message, Row, Col, Checkbox, theme } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { AccountType } from '../../shared/types';

const { Step } = Steps;
const { Option } = Select;

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();
  
  // Store validated accounts separately to ensure they persist
  const [validatedAccounts, setValidatedAccounts] = useState<any[]>([]);

  const steps = [
    { title: 'Welcome', description: 'Get started with BudgetingApp' },
    { title: 'Accounts', description: 'Set up your accounts' },
    { title: 'Preferences', description: 'Configure your preferences' },
    { title: 'Complete', description: 'Finish setup' },
  ];

  const next = async () => {
    try {
      await form.validateFields();
      
      // Additional validation for accounts step
      if (current === 1) {
        const accounts = form.getFieldValue('accounts') || [];
        const validAccounts = accounts.filter((acc: any) => acc && acc.name && acc.account_type);
        
        if (validAccounts.length === 0) {
          message.error('Please add at least one account with a name and type');
          return;
        }
        
        // Store validated accounts
        setValidatedAccounts(validAccounts);
      }
      
      setCurrent(current + 1);
    } catch (error) {
      // Validation failed - form will show errors
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Use the validated accounts we stored, or get from form as fallback
      let accountsToUse = validatedAccounts;
      
      if (accountsToUse.length === 0) {
        // Fallback: try to get from form values
        accountsToUse = (values.accounts || []).filter(
          (acc: any) => acc && acc.name && acc.account_type
        );
      }
      
      const formattedAccounts = accountsToUse.map((acc: any) => ({
        name: acc.name,
        account_type: acc.account_type,
        currency: acc.currency || 'USD',
        initial_balance: acc.initial_balance || 0
      }));
      
      if (formattedAccounts.length === 0) {
        message.error('At least one account is required. Please go back and add an account.');
        setLoading(false);
        return;
      }
      
      const setupData = {
        accounts: formattedAccounts,
        currency: values.currency || 'USD',
        fiscal_year_start_month: values.fiscal_year_start_month || 1,
        date_format: values.date_format || 'MM/DD/YYYY',
        budget_period_preference: values.budget_period_preference || 'monthly',
        allow_budget_rollover: values.allow_budget_rollover || false,
        use_preset_categories: true,
        enable_multi_currency: values.enable_multi_currency || false,
      };

      await apiClient.initializeApp(setupData);
      message.success('Setup completed successfully!');
      onComplete();
    } catch (error: any) {
      message.error(error.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return (
          <Card>
            <h2>Welcome to BudgetingApp!</h2>
            <p>Let's set up your budgeting application in a few simple steps.</p>
            <p>We'll help you:</p>
            <ul>
              <li>Create your initial accounts</li>
              <li>Configure your preferences</li>
              <li>Set up preset categories</li>
            </ul>
          </Card>
        );

      case 1:
        return (
          <Card title="Add Your Accounts">
            <Form.List name="accounts" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <Row key={field.key} gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'name']}
                          rules={[{ required: true, message: 'Account name required' }]}
                        >
                          <Input placeholder="Account Name" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'account_type']}
                          rules={[{ required: true, message: 'Type required' }]}
                        >
                          <Select placeholder="Account Type">
                            <Option value={AccountType.CHECKING}>Checking</Option>
                            <Option value={AccountType.SAVINGS}>Savings</Option>
                            <Option value={AccountType.CREDIT_CARD}>Credit Card</Option>
                            <Option value={AccountType.CASH}>Cash</Option>
                            <Option value={AccountType.INVESTMENT}>Investment</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'initial_balance']}
                          initialValue={0}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Initial Balance"
                            prefix="$"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'currency']}
                          initialValue="USD"
                        >
                          <Input placeholder="USD" />
                        </Form.Item>
                      </Col>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      )}
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                    Add Account
                  </Button>
                </>
              )}
            </Form.List>
          </Card>
        );

      case 2:
        return (
          <Card title="Configure Preferences">
            <Form.Item label="Default Currency" name="currency" initialValue="USD">
              <Input placeholder="USD" />
            </Form.Item>

            <Form.Item
              label="Fiscal Year Start Month"
              name="fiscal_year_start_month"
              initialValue={1}
            >
              <Select>
                {Array.from({ length: 12 }, (_, i) => (
                  <Option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Date Format"
              name="date_format"
              initialValue="MM/DD/YYYY"
            >
              <Select>
                <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Default Budget Period"
              name="budget_period_preference"
              initialValue="monthly"
            >
              <Select>
                <Option value="weekly">Weekly</Option>
                <Option value="monthly">Monthly</Option>
                <Option value="quarterly">Quarterly</Option>
                <Option value="annual">Annual</Option>
              </Select>
            </Form.Item>

            <Form.Item name="allow_budget_rollover" valuePropName="checked">
              <Checkbox>Allow budget rollover to next period</Checkbox>
            </Form.Item>

            <Form.Item name="enable_multi_currency" valuePropName="checked">
              <Checkbox>Enable multi-currency support</Checkbox>
            </Form.Item>
          </Card>
        );

      case 3:
        return (
          <Card>
            <h2>Setup Complete!</h2>
            <p>Your budgeting application is ready to use.</p>
            <p>Click "Finish" to start managing your finances.</p>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      style={{ 
        padding: '50px', 
        maxWidth: '900px', 
        margin: '0 auto',
        minHeight: '100vh',
        background: token.colorBgLayout,
      }}
    >
      <Steps current={current} style={{ marginBottom: 32 }}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} description={item.description} />
        ))}
      </Steps>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {renderStepContent()}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {current > 0 && (
            <Button style={{ marginRight: 8 }} onClick={prev}>
              Previous
            </Button>
          )}
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              Next
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" htmlType="submit" loading={loading}>
              Finish
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

export default SetupWizard;
