'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, resetPasswordForEmail, getUserSettings, updateUserSettings } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
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
  Receipt as ReceiptIcon,
  DollarSign,
  TrendingUp,
  Camera,
  Upload as UploadIcon,
  Lock,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UserMetadata {
  displayName?: string;
  businessName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// Calculate total from subtotal + tax + tip
const getReceiptTotal = (r: Receipt): number => {
  const subtotal = r.subtotal ?? 0;
  const tax = r.tax ?? 0;
  const tip = r.tip ?? 0;
  // If subtotal, tax, or tip exists, calculate total from them
  if (subtotal > 0 || tax > 0 || tip > 0) {
    return subtotal + tax + tip;
  }
  return r.total ?? 0;
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, isPro, isOnTrial, isCancelled, willRenew, getDaysRemaining } = useSubscription();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

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
        setPhoneNumber(authUser.user_metadata?.phoneNumber || '');
        setAvatarUrl(authUser.user_metadata?.avatarUrl || null);
      }

      // Fetch display name and business name from user_settings
      const { data: settings } = await getUserSettings();
      if (settings) {
        setDisplayName(settings.display_name || '');
        setBusinessName(settings.business_name || '');
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
    const totalExpenses = receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0);

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
      // Update display name and business name in user_settings
      const { error: settingsError } = await updateUserSettings({
        display_name: displayName.trim() || null,
        business_name: businessName.trim() || null,
      });

      if (settingsError) throw settingsError;

      // Update phone number in user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          phoneNumber,
        },
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // State for password reset confirmation
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);

  // Handle password reset via email
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setSendingPasswordReset(true);
    setError(null);
    setShowPasswordResetConfirm(false);

    try {
      const { error } = await resetPasswordForEmail(user.email);
      if (error) throw error;

      setSuccess(true);
      setError(null);
      // Show success message
      alert('Email Sent!\n\nCheck your email for the password reset link. Click the "Reset Password" button in the email to set your new password.');
    } catch (err) {
      console.error('Error sending password reset:', err);
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  // Show confirmation dialog
  const handlePasswordResetClick = () => {
    setShowPasswordResetConfirm(true);
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <UploadIcon className="w-3 h-3 mr-1" />
                      )}
                      Upload
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Camera
                    </Button>
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
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {displayName || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Subscription</p>
                    <p className="font-semibold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
                      {isPro ? (
                        <>
                          <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                          <span className="text-amber-600">
                            Pro {(subscription?.plan_type === 'annual' || subscription?.plan_type === 'pro_annual') ? '(Yearly)' : '(Monthly)'}
                          </span>
                          {isOnTrial && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Trial
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                              Cancelled
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                          <span className="text-slate-600">Free Plan</span>
                        </>
                      )}
                    </p>
                    {/* Subscription dates */}
                    {isPro && (
                      <div className="mt-1 text-xs text-slate-500">
                        {isCancelled ? (
                          <p className="flex items-center justify-center sm:justify-start gap-1 text-amber-600">
                            <Clock className="w-3 h-3" />
                            Pro ends: {formatDate(subscription?.ends_at || subscription?.current_period_end)}
                            {getDaysRemaining() !== null && ` (${getDaysRemaining()} days left)`}
                          </p>
                        ) : (
                          <p className="flex items-center justify-center sm:justify-start gap-1">
                            <Calendar className="w-3 h-3" />
                            Next renewal: {formatDate(subscription?.renews_at || subscription?.current_period_end)}
                          </p>
                        )}
                      </div>
                    )}
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
                      value={user.email || ''}
                      disabled
                      className="pl-11 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Password Change Section */}
                <div className="pt-3 sm:pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">Password</p>
                      <p className="text-xs text-slate-500">Send a reset link to your email</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasswordResetClick}
                      disabled={sendingPasswordReset}
                    >
                      {sendingPasswordReset ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Change Password ›
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Statistics (1/3 width) */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">Account Statistics</h2>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                {/* Total Receipts */}
                <Card className="bg-gradient-to-t from-cyan-500/5 to-card shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <ReceiptIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
                      <span className="text-sm sm:text-base font-medium">Receipts</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {stats.totalReceipts}
                    </p>
                  </CardContent>
                </Card>

                {/* Total Expenses */}
                <Card className="bg-gradient-to-t from-green-500/5 to-card shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      <span className="text-sm sm:text-base font-medium">Expenses</span>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 truncate">
                      {formatCurrency(stats.totalExpenses)}
                    </p>
                  </CardContent>
                </Card>

                {/* Account Age */}
                <Card className="bg-gradient-to-t from-purple-500/5 to-card shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                      <span className="text-sm sm:text-base font-medium">Account Age</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {stats.accountAge}{' '}
                      <span className="text-sm sm:text-base font-normal">
                        {stats.accountAge === 1 ? 'day' : 'days'}
                      </span>
                    </p>
                  </CardContent>
                </Card>

                {/* Last Receipt */}
                <Card className="bg-gradient-to-t from-amber-500/5 to-card shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                      <span className="text-sm sm:text-base font-medium">Last Receipt</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {stats.lastReceiptDate
                        ? formatDate(stats.lastReceiptDate)
                        : 'No receipts yet'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Confirmation Dialog */}
      {showPasswordResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="bg-cyan-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Change Password</h3>
              <p className="text-slate-600">
                A password reset link will be sent to:
              </p>
              <p className="text-cyan-600 font-medium mt-1">{user?.email}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPasswordResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={handlePasswordReset}
                disabled={sendingPasswordReset}
              >
                {sendingPasswordReset ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
