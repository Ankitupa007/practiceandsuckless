import {createClient} from "@/utils/supabase/server";
import {redirect} from "next/navigation";
import PracticeTracker from "@/app/dashboard/components/dashboard";


export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
      <main className={"container"}>
        <PracticeTracker userId={user.id} />
      </main>
  );
}
