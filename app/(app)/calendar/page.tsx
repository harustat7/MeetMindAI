import { CalendarDays, Copy, ExternalLink, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CalendarSetupPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <header className="border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Connect Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Import Google Calendar meetings with an iCal URL.</p>
        </div>
      </header>

      <section className="py-5">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Google iCal import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/calendar/ics/import" method="post" className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="icsUrl">Secret iCal URL</Label>
                  <Input id="icsUrl" name="icsUrl" type="url" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" required />
                </div>
                <Button type="submit" className="sm:w-40">
                  <UploadCloud className="h-4 w-4" />
                  Import
                </Button>
              </div>
            </form>

            <div className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
              <Hint icon={<ExternalLink className="h-4 w-4" />} title="Open settings" body="Google Calendar -> Settings and sharing" />
              <Hint icon={<Copy className="h-4 w-4" />} title="Copy link" body="Use Secret address in iCal format" />
              <Hint icon={<UploadCloud className="h-4 w-4" />} title="Import" body="Events appear as meetings" />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Keep the secret iCal URL private. Anyone with the link can read that calendar feed.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Hint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-md border bg-muted/30 p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
