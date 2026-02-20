import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PeopleTable } from "@/components/PeopleTable";

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { score: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">People</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} — sorted by risk
          </p>
        </div>
      </div>
      <PeopleTable contacts={contacts} />
    </div>
  );
}
