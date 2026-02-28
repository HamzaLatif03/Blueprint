import { GraduationCap, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Postgrad = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-accent" />
          Postgrad Opportunities
        </h1>
        <p className="mt-2 text-muted-foreground">
          Discover PhD and Masters programmes matched to your interests and background.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find Programmes</CardTitle>
          <CardDescription>Tell us about your interests and we'll match you with relevant opportunities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Search className="h-4 w-4" /> Search Programmes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Postgrad;
