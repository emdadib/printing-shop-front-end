import type { ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickCustomerDialog from './QuickCustomerDialog';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/services/api', () => ({
  apiService: { post: postMock },
}));

const renderDialog = (props: Partial<ComponentProps<typeof QuickCustomerDialog>> = {}) => {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<QuickCustomerDialog open onClose={onClose} onCreated={onCreated} {...props} />);
  return { onClose, onCreated };
};

describe('QuickCustomerDialog', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('creates a customer from just a name and reports it back', async () => {
    const user = userEvent.setup();
    const created = { id: 'cust-1', firstName: 'Rahim', lastName: '', email: null, phone: null };
    postMock.mockResolvedValue({ success: true, data: created });
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText(/customer name/i), 'Rahim');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/customers', { firstName: 'Rahim', lastName: '' });
  });

  it('submits when Enter is pressed in the name field', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({ success: true, data: { id: 'cust-2', firstName: 'Karim', lastName: '' } });
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText(/customer name/i), 'Karim{enter}');

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/customers', { firstName: 'Karim', lastName: '' });
  });

  it('splits a multi-word name and sends the phone when provided', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({ success: true, data: { id: 'cust-3', firstName: 'Abdul', lastName: 'Rahim Khan' } });
    renderDialog();

    await user.type(screen.getByLabelText(/customer name/i), 'Abdul Rahim Khan');
    await user.type(screen.getByLabelText(/phone/i), '01700000000');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/customers', {
        firstName: 'Abdul',
        lastName: 'Rahim Khan',
        phone: '01700000000',
      })
    );
  });

  it('pre-fills the name from the text typed into the customer search', () => {
    renderDialog({ initialName: 'Karim' });

    expect(screen.getByLabelText(/customer name/i)).toHaveValue('Karim');
  });

  it('shows a validation message and skips the API when the name is blank', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText(/customer name/i), '   ');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows the server error message when creation fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue({ response: { data: { message: 'Email already exists' } } });
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText(/customer name/i), 'Rahim');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
