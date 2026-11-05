import { Button } from "@/components/ui/button";
import { MapPin, Clock, Compass, Bell, BookOpen, WifiOff, Moon, ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const features = [
  { icon: MapPin, title: "Nearby mosques", desc: "Live jamaat times" },
  { icon: Bell, title: "Adhan alarms", desc: "Works when closed" },
  { icon: Compass, title: "Qibla compass", desc: "Precise direction" },
  { icon: BookOpen, title: "Quran & Hadith", desc: "Listen & read" },
  { icon: Moon, title: "Ramadan mode", desc: "Sahar & Iftar" },
  { icon: WifiOff, title: "Works offline", desc: "Your mosque saved" },
];

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-primary-foreground px-6 pt-14 pb-20 rounded-b-[2.5rem]">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-primary-foreground/10" />
        <div className="relative max-w-md mx-auto text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center text-4xl shadow-lg">
            🕌
          </div>
          <p className="text-sm opacity-80 mb-1" dir="rtl">السَّلَامُ عَلَيْكُمْ</p>
          <h1 className="text-3xl font-bold mb-3">Welcome to Prayer Guide</h1>
          <p className="opacity-90 leading-relaxed text-sm">
            Never miss a jamaat. Accurate prayer times from your own mosque, wherever you are.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-5 -mt-10 pb-8 flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm animate-fade-in"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mb-6">
          <Clock className="w-3.5 h-3.5" />
          Takes less than a minute to set up
        </div>

        <Button onClick={onGetStarted} size="lg" className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg mt-auto">
          Get Started
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
