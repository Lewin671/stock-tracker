import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, LineChart, List, Menu, TrendingUp } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import UserMenu from '../UserMenu';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const getPageTitle = (pathname: string): string => {
    const titles: Record<string, string> = {
        '/': 'Dashboard',
        '/dashboard': 'Dashboard',
        '/holdings': 'Holdings',
        '/performance': 'Performance',
        '/backtest': 'Backtest',
        '/watchlist': 'Watchlist',
        '/search': 'Search',
        '/asset-styles': 'Asset Styles',
    };
    return titles[pathname] || 'Dashboard';
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Holdings', href: '/holdings', icon: PieChart },
        { name: 'Performance', href: '/performance', icon: LineChart },
        { name: 'Backtest', href: '/backtest', icon: TrendingUp },
        { name: 'Watchlist', href: '/watchlist', icon: List },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } bg-card border-r border-border transition-all duration-300 flex flex-col fixed h-full z-30 hidden md:flex`}
            >
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                            S
                        </div>
                        {isSidebarOpen && <span>StockTracker</span>}
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                        {isSidebarOpen && <span className="font-medium">Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {/* Add mobile menu logic here if needed later */}

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                {/* Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-20 px-6 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/')}
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                    >
                        {navigation.find((n) => n.href === location.pathname)?.name || getPageTitle(location.pathname)}
                    </button>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-6 overflow-auto">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
