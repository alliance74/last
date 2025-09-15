import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import type { User as AuthUser } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, CreditCard, Shield, LogOut, Edit3, Save, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UserMetadata {
  creationTime?: string;
  lastSignInTime?: string;
}

interface UserProfile extends AuthUser {
  metadata?: UserMetadata;
  plan?: string;
  credits?: number;
  nextBilling?: string;
  createdAt?: string;
  photoURL?: string | null;
}

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<{ displayName: string; email: string }>({
    displayName: "",
    email: ""
  });
  

  useEffect(() => {
    if (currentUser) {
      // Format the user data for display
      const formattedUser: UserProfile = {
        ...currentUser,
        displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
        metadata: {
          creationTime: currentUser.metadata?.creationTime || new Date().toISOString(),
          lastSignInTime: currentUser.metadata?.lastSignInTime || new Date().toISOString()
        },
        plan: "Free", // Default plan
        credits: 0, // Default credits
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        createdAt: currentUser.metadata?.creationTime || new Date().toISOString()
      };
      
      setUserProfile(formattedUser);
      setEditData({
        displayName: formattedUser.displayName || "",
        email: formattedUser.email || ""
      });
      setIsLoading(false);
    }
  }, [currentUser]);

  if (isLoading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    try {
      // In a real app, you would update the user's profile in your backend here
      // For now, we'll just update the local state
      if (!userProfile) return;
      
      const updatedProfile = {
        ...userProfile,
        displayName: editData.displayName || '',
        email: editData.email
      };
      
      setUserProfile(updatedProfile);
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpgradePlan = () => {
    // In a real app, this would redirect to the pricing/upgrade page
    toast({
      title: "Upgrade Plan",
      description: "Redirecting to upgrade options...",
    });
  };

  const handleCancelSubscription = () => {
    // In a real app, this would call your backend to cancel the subscription
    toast({
      title: "Subscription Cancelled",
      description: "Your subscription will remain active until the next billing date.",
    });
  };

  if (!userProfile) return null;

  // Helper function to get user initials
  const getUserInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    try {
      // In a real app, you would update the user's profile here
      // For now, we'll just update the local state
      const updatedProfile = {
        ...userProfile,
        displayName: editData.displayName || '',
        email: editData.email
      };
      
      setUserProfile(updatedProfile);
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userProfile.photoURL} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {getUserInitials(userProfile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{userProfile.displayName}</h1>
                <p className="text-muted-foreground">{userProfile.email}</p>
                <p className="text-sm text-muted-foreground">
                  Member since {formatDate(userProfile.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  {userProfile.plan || 'Free'} Plan
                </Badge>
                {userProfile.credits !== undefined && (
                  <Badge variant="secondary" className="gap-1">
                    {userProfile.credits} Credits
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex-1 sm:flex-none"
                >
                  {isEditing ? (
                    <Save className="mr-2 h-4 w-4" />
                  ) : (
                    <Edit3 className="mr-2 h-4 w-4" />
                  )}
                  {isEditing ? "Save Changes" : "Edit Profile"}
                </Button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account">
                <User className="mr-2 h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Update your account information and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      {isEditing ? (
                        <Input
                          id="displayName"
                          value={editData.displayName}
                          onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-sm">{userProfile.displayName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-sm">{userProfile.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Account Created</Label>
                      <p className="text-sm">{formatDate(userProfile.createdAt)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Last Sign In</Label>
                      <p className="text-sm">
                        {userProfile.lastSignInTime ? formatDate(userProfile.lastSignInTime) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div>
                          <h3 className="font-semibold text-foreground">Premium Plan</h3>
                          <p className="text-muted-foreground">$9.99/month • Next billing: {userProfile.nextBilling}</p>
                        </div>
                        <Badge className="gradient-primary text-primary-foreground">Active</Badge>
                      </div>
                      
                      <div className="flex gap-4">
                        <Button variant="outline">
                          Update Payment Method
                        </Button>
                        <Button variant="destructive" onClick={() => {/* Implement cancel subscription */}}>
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { date: "Jan 15, 2024", amount: "$9.99", status: "Paid" },
                        { date: "Dec 15, 2023", amount: "$9.99", status: "Paid" },
                        { date: "Nov 15, 2023", amount: "$9.99", status: "Paid" }
                      ].map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <span className="text-foreground">{payment.date}</span>
                          <span className="text-foreground">{payment.amount}</span>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="security" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your account security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Change Password</h3>
                        <p className="text-sm text-muted-foreground">
                          Update your account password
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={() => {/* Implement password change */}}
                      >
                        Change Password
                      </Button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={() => {/* Implement 2FA setup */}}
                      >
                        Enable 2FA
                      </Button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Active Sessions</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage your active login sessions
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={() => {/* Implement session management */}}
                      >
                        Manage Sessions
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-4">Danger Zone</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg bg-destructive/5">
                        <div>
                          <h4 className="font-medium">Delete Account</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          className="w-full sm:w-auto"
                          onClick={() => {/* Implement account deletion */}}
                        >
                          Delete Account
                        </Button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Sign Out</h4>
                          <p className="text-sm text-muted-foreground">
                            Sign out of your account on this device
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full sm:w-auto flex items-center gap-2"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
};



export default Profile;