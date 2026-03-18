'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    farmName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.farmName.trim()) return 'Farm name is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.farmName
      );
      
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidations = {
    length: formData.password.length >= 6,
    match: formData.password && formData.confirmPassword && formData.password === formData.confirmPassword,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Farm Account</h1>
          <p className="text-gray-600">Get started managing your farm</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            name="name"
            placeholder="Your full name"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
            required
          />

          <Input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            required
          />

          <Input
            type="text"
            name="farmName"
            placeholder="Farm name"
            value={formData.farmName}
            onChange={handleChange}
            disabled={isLoading}
            required
          />

          <Input
            type="password"
            name="password"
            placeholder="Password (min. 6 characters)"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
          />

          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            required
          />

          {/* Password Validation Feedback */}
          {formData.password && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  passwordValidations.length ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {passwordValidations.length && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <span className={passwordValidations.length ? 'text-gray-700' : 'text-gray-500'}>
                  At least 6 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  passwordValidations.match ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {passwordValidations.match && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <span className={passwordValidations.match ? 'text-gray-700' : 'text-gray-500'}>
                  Passwords match
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !formData.name || !formData.email || !formData.farmName || !formData.password}
            className="w-full mt-6"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-green-600 hover:text-green-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
