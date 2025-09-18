"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

type Species = Database["public"]["Tables"]["species"]["Row"];
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

export default function SpeciesDetailsDialog({ species, userId }: { species: Species; userId: string }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);
  // State variable to track toggleable editing mode of form
  const [isEditing, setIsEditing] = useState(false);

  type FormData = z.infer<typeof speciesSchema>;

  const router = useRouter();

  // Check if current user is the author of this species
  const isAuthor = userId === species.author;

  // Set default values for the form to the existing species data
  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (input: FormData) => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("species")
      .update({
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq("id", species.id);

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
    form.reset(input);

    // Refresh all server components in the current route to display the updated species
    router.refresh();

    return toast({
      title: "Species updated successfully!",
      description: "Successfully updated " + input.scientific_name + ".",
    });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    // If edit canceled, reset the form data to the original values
    form.reset(defaultValues);
    // Turn off editing mode
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          <DialogDescription>
            {species.common_name ? `Also known as ${species.common_name}` : "Species details"}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          // Edit Mode - Show Form
          <Form {...form}>
            <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
              <div className="grid w-full items-center gap-4">
                <FormField
                  control={form.control}
                  name="scientific_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scientific Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Cavia porcellus" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="common_name"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Common Name</FormLabel>
                        <FormControl>
                          <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="kingdom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kingdom</FormLabel>
                      <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a kingdom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            {kingdoms.options.map((kingdom, index) => (
                              <SelectItem key={index} value={kingdom}>
                                {kingdom}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_population"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Total Population</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={value ?? ""}
                            placeholder="300000"
                            {...rest}
                            onChange={(event) => field.onChange(+event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input value={value ?? ""} placeholder="https://example.com/image.jpg" {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea value={value ?? ""} placeholder="Enter species description..." {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Update Species
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        ) : (
          // View Mode - Show Species Details
          <div className="space-y-6">
            {/* Image Section */}
            {species.image && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg">
                <Image
                  src={species.image}
                  alt={species.scientific_name}
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-lg"
                />
              </div>
            )}

            {/* Species Information */}
            <div className="space-y-4">
              <div>
                <h3 className="italic text-gray-600">Scientific Name</h3>
                <p className="text-lg font-semibold text-white">{species.scientific_name}</p>
              </div>

              {species.common_name && (
                <div>
                  <h3 className="italic text-gray-600">Common Name</h3>
                  <p className="text-lg font-semibold text-white">{species.common_name}</p>
                </div>
              )}

              <div>
                <h3 className="italic text-gray-600">Kingdom</h3>
                <p className="text-lg font-semibold text-white">{species.kingdom}</p>
              </div>

              {species.total_population && (
                <div>
                  <h3 className="italic text-gray-600">Total Population</h3>
                  <p className="text-lg font-semibold text-white">{species.total_population.toLocaleString()}</p>
                </div>
              )}

              {species.description && (
                <div>
                  <h3 className="italic text-gray-600">Description</h3>
                  <p className="text-lg font-semibold text-white">{species.description}</p>
                </div>
              )}
            </div>

            {/* Author Information */}
            <div>
              <h3 className="italic text-gray-600">Added by</h3>
              <p className="text-lg font-semibold text-white">{species.profiles?.display_name || "Unknown Author"}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              {isAuthor && <Button onClick={startEditing}>Edit Species</Button>}
              <div className={isAuthor ? "" : "ml-auto"}>
                <DialogClose asChild>
                  <Button variant="secondary">Close</Button>
                </DialogClose>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
