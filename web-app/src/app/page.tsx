import BookingForm from "@/components/BookingForm";
import BookingHistory from "@/components/BookingHistory";

export default function Home() {
  return (
    <div className="min-h-screen relative bg-slate-50 selection:bg-indigo-500/30">
      {/* Background Grid Pattern */}
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Subtle Gradient Spotlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-200/20 rounded-full blur-3xl z-0 pointer-events-none" />

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl tracking-tight">
            Badminton Court Booking
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Reserve your spot and play like a pro.
          </p>
        </div>

        <BookingForm />

        <div className="max-w-4xl mx-auto mt-16 pt-16 border-t border-gray-200/50">
          <BookingHistory />
        </div>
      </div>
    </div>
  );
}
