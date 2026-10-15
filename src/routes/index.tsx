import { createFileRoute } from "@tanstack/react-router";
import PhotoBooth from "@/components/PhotoBooth";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <PhotoBooth />
    </main>
  );
}
