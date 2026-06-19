import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function AccountSettings() {
  const user = useAuthStore(s => s.user);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Validation failed', 'Email is required');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Validation failed', 'Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      toast.success('Account updated', 'Your email and password have been updated');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Account update failed:', error);
      toast.error('Update failed', 'Unable to update account details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
        <p className="mt-2 text-sm text-gray-500">Update your login email and password here.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="mt-2"
            />
          </div>

          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
