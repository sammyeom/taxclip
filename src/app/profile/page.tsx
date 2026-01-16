'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getReceipts } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { Receipt } from '@/types/database';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Receipt as ReceiptIcon,
  DollarSign,
  TrendingUp,
  Camera,
  Upload as UploadIcon,
  Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface UserMetadata {
  displayName?: string;
  businessName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Data state
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [userMetadata, setUserMetadata] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch user data and receipts
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch receipts
      const { data: receiptsData } = await getReceipts();
      setReceipts(receiptsData || []);

      // Fetch user metadata from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUserMetadata(authUser);
        setDisplayName(authUser.user_metadata?.displayName || '');
        setBusinessName(authUser.user_metadata?.businessName || '');
        setPhoneNumber(authUser.user_metadata?.phoneNumber || '');
        setAvatarUrl(authUser.user_metadata?.avatarUrl || null);
        setEmail(authUser.email || '');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReceipts = receipts.length;
    const totalExpenses = receipts.reduce((sum, r) => sum + (r.total || 0), 0);

    // Calculate account age
    const createdAt = userMetadata?.created_at ? new Date(userMetadata.created_at) : null;
    const now = new Date();
    const accountAge = createdAt
      ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Last receipt uploaded
    const lastReceipt = receipts.length > 0
      ? receipts.reduce((latest, r) => {
          const rDate = new Date(r.created_at);
          const latestDate = new Date(latest.created_at);
          return rDate > latestDate ? r : latest;
        })
      : null;

    return {
      totalReceipts,
      totalExpenses,
      accountAge,
      lastReceiptDate: lastReceipt ? new Date(lastReceipt.created_at) : null,
    };
  }, [receipts, userMetadata]);

  // Handle photo upload
  const handlePhotoUpload = async (file: File) => {
    if (!user) return;

    setUploadingPhoto(true);
    setError(null);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts') // Using existing bucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatarUrl: publicUrl,
        },
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      handlePhotoUpload(file);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          displayName,
          businessName,
          phoneNumber,
        },
      });

      if (updateError) throw updateError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;

        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordFields(false);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    setError(null);

    try {
      // Note: Supabase doesn't have a direct user deletion API from client
      // This would need to be implemented via a server-side function
      // For now, we'll show an error message
      throw new Error(
        'Account deletion must be requested through support. Please contact support@taxclip.com'
      );
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get user initials
  const getUserInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Profile</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage your account information and preferences</p>
        </div>

        {/* Success/Error Alerts */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Success</h3>
              <p className="text-green-700 text-sm">Your profile has been updated</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Left Column - Profile Info (2/3 width) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Profile Picture and Basic Info */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">Profile Information</h2>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                {/* Avatar */}
                <div className="flex-shrink-0 text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-cyan-500 rounded-full flex items-center justify-center overflow-hidden mx-auto">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-bold text-white">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 flex gap-2 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UploadIcon className="w-3 h-3" />
                      )}
                      <span>Upload</span>
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Camera</span>
                    </button>
                  </div>
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Basic Info */}
                <div className="flex-1 w-full space-y-2 sm:space-y-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Email</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-xs sm:text-sm text-slate-700 flex items-center justify-center sm:justify-start gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{formatDate(userMetadata?.created_at)}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Sign In</p>
                      <p className="text-xs sm:text-sm text-slate-700 flex items-center justify-center sm:justify-start gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">{formatDate(userMetadata?.last_sign_in_at)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-slate-200">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                    Business Name
                  </label>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                      <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <Input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter your business name"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                    Phone <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-11"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Changing email requires verification
                  </p>
                </div>

                {/* Password Change Section */}
                <div className="pt-3 sm:pt-4 border-t border-slate-200">
                  {!showPasswordFields ? (
                    <button
                      onClick={() => setShowPasswordFields(true)}
                      className="text-xs sm:text-sm text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-2"
                    >
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="pl-11"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" style={{ left: '14px' }}>
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="pl-11"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowPasswordFields(false);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-xs sm:text-sm text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Statistics (1/3 width) */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">Account Statistics</h2>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 lg:space-y-4 lg:gap-0">
                {/* Total Receipts */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-cyan-500 rounded-lg p-1.5 sm:p-2">
                      <ReceiptIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-600">Receipts</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        {stats.totalReceipts}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-green-500 rounded-lg p-1.5 sm:p-2">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-slate-600">Expenses</p>
                      <p className="text-base sm:text-2xl font-bold text-slate-900 truncate">
                        {formatCurrency(stats.totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Age */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-purple-500 rounded-lg p-1.5 sm:p-2">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-600">Account Age</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        {stats.accountAge}{' '}
                        <span className="text-xs sm:text-base">
                          {stats.accountAge === 1 ? 'day' : 'days'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Last Receipt */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-amber-500 rounded-lg p-1.5 sm:p-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-slate-600">Last Receipt</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {stats.lastReceiptDate
                          ? formatDate(stats.lastReceiptDate)
                          : 'No receipts yet'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone - Subtle, at bottom */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700">Delete Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full sm:w-auto text-xs sm:text-sm text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors border border-slate-300 hover:border-slate-400 text-center"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Account</h3>
            </div>

            <p className="text-slate-600 mb-6">
              Are you absolutely sure you want to delete your account? This action cannot be
              undone. All your receipts, data, and settings will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
