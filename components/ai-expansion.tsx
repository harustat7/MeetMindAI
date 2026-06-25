import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExpansionValue = unknown;

const sections: Array<[keyof ExpansionRecord, string]> = [
  ["executionPlan", "Execution plan"],
  ["projectRoadmap", "Project roadmap"],
  ["timeline", "Timeline"],
  ["milestones", "Milestones"],
  ["resourceRequirements", "Resources"],
  ["successMetrics", "Success metrics"]
];

type ExpansionRecord = {
  executionPlan: ExpansionValue;
  projectRoadmap: ExpansionValue;
  timeline: ExpansionValue;
  milestones: ExpansionValue;
  resourceRequirements: ExpansionValue;
  successMetrics: ExpansionValue;
};

export function AIExpansion({ expansion }: { expansion: ExpansionRecord | null }) {
  if (!expansion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meeting Expansion Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Generate an AI summary to create execution plans, roadmaps, timelines, milestones, resources, and metrics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Meeting Expansion Engine</CardTitle>
          <Badge variant="secondary">AI generated</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {sections.map(([key, title]) => (
          <div key={key} className="rounded-md border p-3">
            <h3 className="text-sm font-semibold">{title}</h3>
            <ExpansionList value={expansion[key]} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ExpansionList({ value }: { value: ExpansionValue }) {
  if (!Array.isArray(value) || value.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">No items generated.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {value.map((item, index) => (
        <div key={index} className="text-sm leading-6">
          {typeof item === "string" ? item : <ObjectView value={item} />}
        </div>
      ))}
    </div>
  );
}

function ObjectView({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") {
    return <span>{String(value)}</span>;
  }

  return (
    <div className="space-y-1">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key}>
          <span className="font-medium">{humanize(key)}: </span>
          {Array.isArray(entry) ? (
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {entry.map((item, index) => (
                <li key={`${key}-${index}`}>- {String(item)}</li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">{String(entry ?? "")}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
