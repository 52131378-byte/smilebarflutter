import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'cart_screen.dart';

void main() {
  runApp(MyCrepeShop());
}

class MyCrepeShop extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smile Bar',
      debugShowCheckedModeBanner: false,
      home: CrepeShopHomePage(),
    );
  }
}

class CrepeShopHomePage extends StatefulWidget {
  @override
  _CrepeShopHomePageState createState() => _CrepeShopHomePageState();
}

class _CrepeShopHomePageState extends State<CrepeShopHomePage> {
  final Color mainAccent = const Color(0xFFE98D5A);
  final Color priceColor = const Color(0xFF9C5A40);

  int currentIndex = 0;
  String searchText = '';
  List<dynamic> crepes = [];
  List<Map<String, dynamic>> cartItems = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchCrepes();
  }

  Future<void> fetchCrepes() async {
    try {
      final response =
          await http.get(Uri.parse('http://localhost:5000/api/items'));
      if (response.statusCode == 200) {
        List<dynamic> items = json.decode(response.body);
        for (var item in items) item['isFavorite'] = false;
        setState(() {
          crepes = items;
          isLoading = false;
        });
      } else {
        throw Exception('Failed to load items');
      }
    } catch (e) {
      print('Error fetching items: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  void toggleFavorite(int index) {
    setState(() {
      crepes[index]['isFavorite'] = !(crepes[index]['isFavorite'] ?? false);
    });
  }

  void addToCart(Map<String, dynamic> crepe) {
    // Check if already in cart
    final existingIndex =
        cartItems.indexWhere((item) => item["id"] == crepe["id"]);
    if (existingIndex != -1) {
      cartItems[existingIndex]["quantity"]++;
    } else {
      cartItems.add({
        "id": crepe["id"],
        "name": crepe["name"],
        "price": crepe["price"],
        "image": crepe["image"],
        "quantity": 1
      });
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${crepe['name']} added to cart!'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    List<dynamic> displayedCrepes = currentIndex == 1
        ? crepes.where((c) => c['isFavorite'] == true).toList()
        : crepes
            .where((c) =>
                c['name'].toString().toLowerCase().contains(searchText.toLowerCase()))
            .toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 2,
        centerTitle: true,
        title: Text(
          'Smile Bar',
          style: TextStyle(
            color: mainAccent,
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.shopping_cart_outlined, color: Colors.black87),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => CartScreen(cartItems: cartItems)),
              );
            },
          ),
        ],
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: isLoading
            ? Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (currentIndex == 0) ...[
                    SizedBox(height: 10),
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'Search',
                        prefixIcon: Icon(Icons.search, color: mainAccent),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                      ),
                      onChanged: (value) {
                        setState(() {
                          searchText = value;
                        });
                      },
                    ),
                    SizedBox(height: 16),
                  ],
                  Expanded(
                    child: displayedCrepes.isEmpty
                        ? Center(
                            child: Text(
                              currentIndex == 1
                                  ? 'No favorites yet'
                                  : 'No items found',
                              style: TextStyle(color: Colors.grey, fontSize: 16),
                            ),
                          )
                        : GridView.builder(
                            itemCount: displayedCrepes.length,
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              childAspectRatio: 0.65,
                            ),
                            itemBuilder: (context, index) {
                              final crepe = displayedCrepes[index];
                              final originalIndex = crepes.indexOf(crepe);
                              return Container(
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                padding: EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Stack(
                                        children: [
                                          ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(14),
                                            child: Image.network(
                                              'http://localhost:5000/uploads/${crepe['image']}',
                                              width: double.infinity,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                          Positioned(
                                            top: 4,
                                            right: 4,
                                            child: InkWell(
                                              onTap: () =>
                                                  toggleFavorite(originalIndex),
                                              child: Icon(
                                                crepe['isFavorite']
                                                    ? Icons.favorite
                                                    : Icons.favorite_border,
                                                color: crepe['isFavorite']
                                                    ? Colors.red
                                                    : Colors.grey[600],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      crepe['name'],
                                      style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(height: 4),
                                    Text('\$${crepe['price'].toString()}',
                                        style: TextStyle(
                                            fontSize: 14, color: priceColor)),
                                    SizedBox(height: 8),
                                    Align(
                                      alignment: Alignment.bottomRight,
                                      child: GestureDetector(
                                        onTap: () => addToCart(crepe),
                                        child: Container(
                                          padding: EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: mainAccent,
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Icon(Icons.add,
                                              color: Colors.white, size: 20),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        selectedItemColor: mainAccent,
        unselectedItemColor: Colors.grey[500],
        showSelectedLabels: false,
        showUnselectedLabels: false,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: "Home"),
          BottomNavigationBarItem(icon: Icon(Icons.favorite), label: "Favorites"),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: "Profile"),
        ],
        onTap: (index) {
          setState(() {
            currentIndex = index;
          });
        },
      ),
    );
  }
}
