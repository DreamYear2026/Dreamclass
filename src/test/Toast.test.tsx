import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/Toast';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show success toast', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should show error toast', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should show warning toast', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after 3 seconds', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should dismiss toast when clicking close button', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
    await act(async () => {
      fireEvent.click(closeButtons[closeButtons.length - 1]);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should throw error when useToast is used outside provider', () => {
    const TestErrorComponent = () => {
      useToast();
      return null;
    };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestErrorComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleError.mockRestore();
  });

  it('should show multiple toasts', async () => {
    renderWithProvider();

    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'));
      vi.advanceTimersByTime(1);
      fireEvent.click(screen.getByText('Show Error'));
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
