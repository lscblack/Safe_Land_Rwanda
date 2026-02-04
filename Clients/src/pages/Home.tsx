import { Navbar } from '../components/navigation/Navbar'
import { HeroSection } from '../components/hero/heroPageHome'
import { Footer } from '../components/navigation/FooterAll'
import FeaturesSection from '../components/HomePage/AfterHeroSection'
import { HotDealsLocation } from '../components/HomePage/LocationDeals'
import { CommunitySection } from '../components/HomePage/OurTrusstedAgents'
import MarketAnalysisSection  from '../components/HomePage/TopPlaceForInvestments'
import { MissionVisionSection } from '../components/HomePage/MissionVisionSection'

const Home = () => {
  return (
    <>
      <Navbar/>
      <HeroSection/>
      <MissionVisionSection/>
      <FeaturesSection/>
      <HotDealsLocation/>
      <CommunitySection/>
      <MarketAnalysisSection/>
      <Footer/>
    </>
  )
}

export default Home
