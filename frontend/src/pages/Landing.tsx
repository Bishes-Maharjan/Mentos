import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Keyboard, 
  ShieldCheck, 
  Camera, 
  Zap, 
  ArrowRight,
  TrendingUp,
  CheckCircle,
  FileCheck2
} from 'lucide-react';

const SERVICES = [
  'Digitalising invoices',
  'Generating ledgers',
  'Automatic form filling',
  'Purchase & sales ledger generation',
  'Photo-to-text invoice decoder',
  'PAN number validator',
];

function useTypewriter(words: string[], speed = 80, pause = 1200) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index % words.length];
    let timer: any;

    if (!deleting) {
      if (display === word) {
        // Pause at full word
        timer = setTimeout(() => {
          setDeleting(true);
        }, pause);
      } else {
        // Type next letter
        timer = setTimeout(() => {
          setDisplay(word.slice(0, display.length + 1));
        }, speed);
      }
    } else {
      if (display === '') {
        // Switch to next word
        setDeleting(false);
        setIndex((i) => i + 1);
      } else {
        // Delete next letter
        timer = setTimeout(() => {
          setDisplay(word.slice(0, display.length - 1));
        }, speed / 2);
      }
    }

    return () => clearTimeout(timer);
  }, [display, deleting, index, words, speed, pause]);

  return display;
}

export default function Landing() {
  const typed = useTypewriter(SERVICES, 80, 1200);

  const featureList = [
    {
      icon: FileText,
      title: 'Digitalising Invoices',
      desc: 'Instantly scan and convert paper invoices into structured digital records, capturing vendor details, line items, and tax breakdown automatically.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Generating Ledgers',
      desc: 'Synthesize clean, search-friendly transaction journals. Say goodbye to manual ledger data entry and spreadsheet errors.',
    },
    {
      icon: Keyboard,
      title: 'Automatic Form Filling',
      desc: 'Automatically populate tax returns and government compliance forms. Streamlines reporting for VAT and local regulations.',
    },
    {
      icon: FileCheck2,
      title: 'Purchase & Sales Ledgers',
      desc: 'Export perfectly formatted IRD-compatible purchase and sales registers. Instantly download ready-to-submit tax files.',
    },
    {
      icon: Camera,
      title: 'Photo-to-Text Invoice Decoder',
      desc: 'Take a photo of any bill. Our smart OCR accurately extracts purchase values, tax, PAN, and date in seconds.',
    },
    {
      icon: ShieldCheck,
      title: 'PAN Number Validator',
      desc: 'Verify Nepalese taxpayer registration status against IRD patterns in real time to avoid fraud and filing compliance penalties.',
    },
  ];

  return (
    <div className="landing-root">
      <div className="landing-overlay">
        


        {/* Hero Section */}
        <main className="landing-hero">
          <div className="landing-copy">
            
            <h1 className="landing-title">
              Meet <span className="title-gradient">Kaji.ai</span>
            </h1>
            
            <div className="landing-sub">
              <span className="sub-prefix">Automate </span>
              <span className="type">{typed}</span>
              <span className="cursor">|</span>
            </div>

            <p className="landing-desc">
              Unleash AI-powered accounting tailored for Nepalese businesses. Decode invoices, generate ledgers, and file VAT returns instantly.
            </p>

            <div className="landing-cta">
              <Link className="btn btn--primary btn--hero" to="/assign">
                <span>Assign Kaji</span>
                <ArrowRight size={18} />
              </Link>

            </div>
          </div>
        </main>


      </div>
    </div>
  );
}

