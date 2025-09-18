"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { type Database } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";

// Use Zod to define the shape + requirements of a Profile entry; used in form validation
const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(30, {
      message: "Username must not be longer than 30 characters.",
    })
    .transform((val) => val.trim()),
  bio: z
    .string()
    .max(160, {
      message: "Biography cannot be longer than 160 characters.",
    })
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

// Extract Profile type from Supabase schema
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ProfileForm({ profile }: { profile: Profile }) {
  // State variable to track toggleable editing mode of form
  const [isEditing, setIsEditing] = useState(false);

  // Set default values for the form (on open) to the existing profile data which was passed in as a prop
  const defaultValues = {
    username: profile.display_name,
    bio: profile.biography,
  };

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const router = useRouter();

  const onSubmit = async (data: ProfileFormValues) => {
    // Instantiate Supabase client (for client components) and make update based on input data
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ biography: data.bio, display_name: data.username })
      .eq("id", profile.id);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit

    setIsEditing(false);

    // Reset form values to the data values that have been processed by zod.
    // This is helpful to do after EDITING, so that the user sees any changes that have occurred during transformation
    form.reset(data);

    // Router.refresh does not affect ProfileForm because it is a client component, but it will refresh the initials in the user-nav in the event of a username change
    router.refresh();

    return toast({
      title: "Profile updated successfully!",
    });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    // If edit canceled, reset the form data to the original values which were set from props
    form.reset(defaultValues);
    // Turn off editing mode
    setIsEditing(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                {/* Set inputs to readOnly (boolean prop) depending on toggleable value of isEditing */}
                <Input readOnly={!isEditing} placeholder="Username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name. It can be your real name or a pseudonym.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input readOnly placeholder={profile.email} />
          </FormControl>
          <FormDescription>This is your verified email address.</FormDescription>
          <FormMessage />
        </FormItem>
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => {
            // We must extract value from field and convert a potential defaultValue of `null` to "" because form inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
            const { value, ...rest } = field;
            return (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    readOnly={!isEditing}
                    value={value ?? ""}
                    placeholder="Tell us a little bit about yourself"
                    className="resize-none"
                    {...rest}
                  />
                </FormControl>
                <FormDescription>A short description of yourself!</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        {/* Conditionally render action buttons depending on if the form is in viewing/editing mode */}
        {isEditing ? (
          <>
            <Button type="submit" className="mr-2">
              Update profile
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          // Toggle editing mode
          <Button onClick={startEditing}>Edit Profile</Button>
        )}
      </form>
    </Form>
  );
}
