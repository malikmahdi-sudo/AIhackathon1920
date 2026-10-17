import Link from "next/link";

export default function MissingEdition() {
  return <main id="main-content" className="paper-shell empty-edition"><p className="eyebrow">Not in your collection</p><h1>No edition for this date.</h1><p>Only papers you have opened are saved. Choose an edition from your archive.</p><Link href="/archives" className="button">Back to your editions</Link></main>;
}
